import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { BookingDraftStore } from "../state/booking-draft.store";

const API = "http://localhost:3000";
type Slot = { time: string; available: boolean };

function pad2(n: number) { return String(n).padStart(2, "0"); }
function isoFromYMD(y: number, m0: number, d: number) {
  // m0 = 0..11
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}
function formatDMY(iso: string) {
  // YYYY-MM-DD -> DD-MM-YYYY
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m0: m - 1, d };
}
function todayISO(): string {
  const d = new Date();
  return isoFromYMD(d.getFullYear(), d.getMonth(), d.getDate());
}
function monthNamePt(m0: number) {
  return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][m0];
}
function daysInMonth(y: number, m0: number) {
  return new Date(y, m0 + 1, 0).getDate();
}
function firstWeekdayMon0(y: number, m0: number) {
  // devolve 0..6 com segunda=0
  const js = new Date(y, m0, 1).getDay(); // 0=Dom..6=Sáb
  return (js + 6) % 7;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="center-screen">
    <div class="card" style="width:min(920px, 96vw);">
      <div class="title">Escolhe o dia e a hora</div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <!-- ESQUERDA: calendário + slots -->
        <div>
          <label class="title" style="display:block; margin-bottom:8px;">Data</label>

          <!-- Campo calendário -->
          <div style="position:relative;">
            <button class="select" type="button"
              style="display:flex; align-items:center; justify-content:space-between; cursor:pointer"
              (click)="toggleCal()">
              <span>{{ displayDate }}</span>
              <span style="opacity:.85">📅</span>
            </button>

            <!-- Popover calendário -->
            <div *ngIf="calOpen" style="
              position:absolute; top:52px; left:0; z-index:50;
              width:320px;
              background:var(--panel);
              border:1px solid var(--line);
              border-radius:14px;
              padding:12px;
              box-shadow: 0 18px 40px rgba(0,0,0,0.55);
            ">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
                <button class="btn" style="width:auto; padding:8px 10px" (click)="prevMonth()">‹</button>
                <div style="font-weight:700; letter-spacing:.04em;">
                  {{ monthLabel }}
                </div>
                <button class="btn" style="width:auto; padding:8px 10px" (click)="nextMonth()">›</button>
              </div>

              <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; margin-bottom:8px; color:var(--muted); font-size:12px;">
                <div style="text-align:center">Seg</div>
                <div style="text-align:center">Ter</div>
                <div style="text-align:center">Qua</div>
                <div style="text-align:center">Qui</div>
                <div style="text-align:center">Sex</div>
                <div style="text-align:center">Sáb</div>
                <div style="text-align:center">Dom</div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;">
                <div *ngFor="let cell of calendarCells">
                  <button *ngIf="cell.day"
                    class="btn"
                    style="width:100%; padding:10px 0;"
                    [style.borderColor]="cell.iso === date ? 'var(--chrome1)' : 'var(--chrome2)'"
                    (click)="pickDate(cell.iso!)">
                    {{ cell.day }}
                  </button>
                  <div *ngIf="!cell.day" style="height:42px;"></div>
                </div>
              </div>

              <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn" style="width:50%" (click)="pickDate(today)">Hoje</button>
                <button class="btn" style="width:50%" (click)="closeCal()">Fechar</button>
              </div>
            </div>
          </div>

          <div style="height:12px"></div>

          <label class="title" style="display:block; margin-bottom:8px;">Hora</label>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <button
              class="btn"
              *ngFor="let s of slots"
              style="width:auto; padding:10px 12px;"
              [disabled]="!s.available"
              [style.borderColor]="time===s.time ? 'var(--chrome1)' : 'var(--chrome2)'"
              [style.opacity]="s.available ? '1' : '0.35'"
              (click)="pickTime(s.time)">
              {{ s.time }}
            </button>
          </div>
        </div>

        <!-- DIREITA: form -->
        <div>
          <label class="title" style="display:block; margin-bottom:8px;">Dados do cliente</label>

          <input class="select" placeholder="Nome" [(ngModel)]="customerName">
          <div style="height:10px"></div>

          <input class="select" placeholder="Telemóvel" [(ngModel)]="customerPhone">
          <div style="height:10px"></div>

          <input class="select" placeholder="Email" [(ngModel)]="customerEmail">
          <div style="height:10px"></div>

          <input class="select" placeholder="Matrícula (opcional)" [(ngModel)]="plate">
          <div style="height:10px"></div>

          <textarea class="select" style="min-height:88px; resize:vertical" placeholder="Observações (opcional)" [(ngModel)]="notes"></textarea>

          <div style="height:14px"></div>
          <button class="btn" (click)="confirm()" [disabled]="!canConfirm()">Confirmar Marcação</button>
        </div>
      </div>

      <div style="height:14px"></div>

      <div style="border-top:1px solid var(--line); padding-top:14px; color:var(--muted); font-size:14px">
        <div><b>Resumo</b></div>
        <div>Serviço: {{ serviceLabel }}</div>
        <div>Veículo: {{ vehicleLabel }}</div>
        <div>Data/Hora: {{ formatDMY(date) }} {{ time || '—' }}</div>
      </div>
    </div>
  </div>
  `
})
export class SchedulePage implements OnInit {
  serviceType!: "WASH_FULL" | "REVIEW";
  makeId!: number;
  modelId!: number;
  makeName!: string;
  modelName!: string;

  date = todayISO();
  time = "";

  slots: Slot[] = [];

  customerName = "";
  customerPhone = "";
  customerEmail = "";
  plate = "";
  notes = "";

  // calendário
  calOpen = false;
  today = todayISO();
  viewY = new Date().getFullYear();
  viewM0 = new Date().getMonth();

  constructor(
    private store: BookingDraftStore,
    private http: HttpClient,
    private router: Router
  ) {}

  get serviceLabel() { return this.serviceType === "WASH_FULL" ? "Lavagem Completa" : "Revisão"; }
  get vehicleLabel() { return `${this.makeName} ${this.modelName}`; }
  get displayDate() { return formatDMY(this.date); }
  formatDMY = formatDMY;

  get monthLabel() { return `${monthNamePt(this.viewM0)} ${this.viewY}`; }

  get calendarCells(): Array<{ day?: number; iso?: string }> {
    const first = firstWeekdayMon0(this.viewY, this.viewM0);
    const dim = daysInMonth(this.viewY, this.viewM0);

    const cells: Array<{ day?: number; iso?: string }> = [];
    for (let i = 0; i < first; i++) cells.push({});
    for (let d = 1; d <= dim; d++) cells.push({ day: d, iso: isoFromYMD(this.viewY, this.viewM0, d) });
    while (cells.length % 7 !== 0) cells.push({});
    return cells;
  }

  ngOnInit() {
    const d = this.store.get();
    if (!d.serviceType || !d.makeId || !d.modelId || !d.makeName || !d.modelName) {
      this.router.navigateByUrl("/");
      return;
    }

    this.serviceType = d.serviceType;
    this.makeId = d.makeId;
    this.modelId = d.modelId;
    this.makeName = d.makeName;
    this.modelName = d.modelName;

    if (d.date) this.date = d.date;
    if (d.time) this.time = d.time;

    const { y, m0 } = parseISO(this.date);
    this.viewY = y; this.viewM0 = m0;

    this.loadSlots();
  }

  toggleCal() { this.calOpen = !this.calOpen; }
  closeCal() { this.calOpen = false; }

  prevMonth() {
    if (this.viewM0 === 0) { this.viewM0 = 11; this.viewY -= 1; }
    else this.viewM0 -= 1;
  }

  nextMonth() {
    if (this.viewM0 === 11) { this.viewM0 = 0; this.viewY += 1; }
    else this.viewM0 += 1;
  }

  pickDate(iso: string) {
    this.date = iso;
    this.time = "";
    this.store.set({ date: this.date, time: "" });

    const { y, m0 } = parseISO(iso);
    this.viewY = y; this.viewM0 = m0;

    this.calOpen = false;
    this.loadSlots();
  }

  loadSlots() {
    this.http.get<{ date: string; slots: Slot[] }>(`${API}/api/availability?date=${this.date}`)
      .subscribe(r => this.slots = r.slots);
  }

  pickTime(t: string) {
    this.time = t;
    this.store.set({ time: t });
  }

  canConfirm() {
    return !!this.date && !!this.time
      && this.customerName.trim().length >= 2
      && this.customerPhone.trim().length >= 6
      && this.customerEmail.includes("@");
  }

  confirm() {
    const payload = {
      serviceType: this.serviceType,
      makeId: this.makeId,
      modelId: this.modelId,
      date: this.date,      // continua a enviar ISO para a API
      time: this.time,
      customerName: this.customerName.trim(),
      customerPhone: this.customerPhone.trim(),
      customerEmail: this.customerEmail.trim(),
      plate: this.plate.trim() || undefined,
      notes: this.notes.trim() || undefined
    };

    this.http.post<{ bookingId: string }>(`${API}/api/bookings`, payload)
      .subscribe({
        next: () => {
          this.store.set({
            customerName: payload.customerName,
            customerPhone: payload.customerPhone,
            customerEmail: payload.customerEmail,
            plate: payload.plate,
            notes: payload.notes
          });
          this.router.navigateByUrl("/success");
        },
        error: (err) => {
          alert(err?.error?.error || "Erro ao confirmar.");
          this.loadSlots();
        }
      });
  }
}
