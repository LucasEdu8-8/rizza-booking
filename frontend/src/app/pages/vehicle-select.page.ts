import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { BookingDraft, BookingDraftStore } from "../state/booking-draft.store";
import { APP_CONFIG } from "../shared/config";
import { TypeaheadSelectComponent } from "../shared/typeahead-select.component";

const API = APP_CONFIG.API_BASE;

type Make = { id: number; name: string };
type Model = { id: number; name: string; makeId: number; imageKey: string };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TypeaheadSelectComponent],
  styles: [`
    :host { display:block; }

    .page {
      position: relative;
      min-height: 100svh;
      overflow: hidden;
    }

    .content {
      position: relative;
      z-index: 1;
      min-height: 100svh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 18px;
    }

    .back {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 2;
    }

    .wrap {
      width: min(980px, 92vw);
      text-align: center;
    }

    .title {
      margin: 0 0 10px 0;
    }

    .panel {
      width: min(620px, 92vw);
      margin: 0 auto;
      background: linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.48));
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      backdrop-filter: blur(10px);
    }

    .gap-10 { height: 10px; }
    .gap-12 { height: 12px; }

    .other-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }

    .other-toggle input {
      width: 14px;
      height: 14px;
    }

    .help-text {
      font-size: 12px;
      color: var(--muted);
      margin-top: 4px;
    }
  `],
  template: `
    <div class="page">
      <div class="bg"></div>

      <button class="btn back" style="width:auto; padding:10px 14px" (click)="back()">Voltar</button>

      <div class="content">
        <div class="wrap">
          <div class="title">Escolhe o teu veiculo</div>

          <div class="panel">
            <app-typeahead-select
              [value]="makeInput"
              (valueChange)="onMakeInputChange($event)"
              [options]="makeOptions"
              placeholder="Marca"
              [disabled]="useOther"
              [loading]="isLoadingMakes"
              [maxResults]="12"
              [minQueryLength]="1"
              matchMode="contains"
            ></app-typeahead-select>

            <div class="gap-10"></div>

            <app-typeahead-select
              [value]="modelInput"
              (valueChange)="onModelInputChange($event)"
              [options]="modelOptions"
              placeholder="Modelo"
              [disabled]="useOther || !makeId"
              [loading]="isLoadingModels"
              [maxResults]="12"
              [minQueryLength]="1"
              matchMode="contains"
            ></app-typeahead-select>

            <div class="gap-10"></div>

            <label class="other-toggle">
              <input
                type="checkbox"
                [(ngModel)]="useOther"
                (ngModelChange)="onOtherToggle($event)"
              />
              Nao encontro a minha marca/modelo
            </label>
            <div class="help-text">Marca esta opcao para usar "Outro".</div>

            <div class="gap-10"></div>

            <input
              class="select"
              placeholder="Ano (opcional)"
              inputmode="numeric"
              maxlength="4"
              [(ngModel)]="vehicleYearInput"
              list="yearsList"
            />

            <datalist id="yearsList">
              <option *ngFor="let y of years" [value]="y"></option>
            </datalist>

            <div class="gap-10" *ngIf="showOtherNotes"></div>

            <textarea
              *ngIf="showOtherNotes"
              class="select"
              style="min-height:88px; resize:vertical"
              placeholder="Notas do veiculo (opcional)"
              [(ngModel)]="otherNotes"
            ></textarea>

            <div class="gap-12"></div>

            <button class="btn" (click)="next()" [disabled]="!makeId || !modelId">Continuar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VehicleSelectPage implements OnInit, OnDestroy {
  makes: Make[] = [];
  models: Model[] = [];

  makeOptions: string[] = [];
  modelOptions: string[] = [];

  makeInput = "";
  modelInput = "";
  makeId: number | null = null;
  modelId: number | null = null;
  makeName: string | null = null;
  modelName: string | null = null;

  isLoadingMakes = false;
  isLoadingModels = false;

  years: number[] = [];
  vehicleYearInput = "";
  otherNotes = "";
  useOther = false;

  constructor(
    private http: HttpClient,
    private store: BookingDraftStore,
    private router: Router
  ) {}

  ngOnInit() {
    document.body.classList.add("no-scroll");
    const draft = this.store.get();
    this.makeId = typeof draft.makeId === "number" ? draft.makeId : null;
    this.modelId = typeof draft.modelId === "number" ? draft.modelId : null;
    this.makeName = typeof draft.makeName === "string" ? draft.makeName : null;
    this.modelName = typeof draft.modelName === "string" ? draft.modelName : null;
    this.makeInput = this.makeName ?? "";
    this.modelInput = this.modelName ?? "";
    this.otherNotes = typeof draft.notes === "string" ? draft.notes : "";
    this.useOther = this.normalizeText(this.makeName ?? "") === "outro" ||
      this.normalizeText(this.modelName ?? "") === "outro";

    const y = new Date().getFullYear();
    this.years = Array.from({ length: 10 }, (_, i) => y - i);

    this.loadMakes();
  }

  private loadMakes() {
    this.isLoadingMakes = true;
    this.http.get<{ makes: Make[] }>(`${API}/api/vehicles/makes`)
      .subscribe({
        next: (r) => {
          this.makes = r.makes ?? [];
          this.makeOptions = this.makes.map(m => m.name);

          const match = this.matchMake(this.makeInput, this.makeId);
          if (match) {
            this.makeId = match.id;
            this.makeName = match.name;
            this.makeInput = match.name;
            const isOther = this.normalizeText(match.name) === "outro";
            if (isOther) {
              this.useOther = true;
              this.fetchModels(match.id, "Outro", null);
            } else {
              this.useOther = false;
              this.fetchModels(match.id, this.modelInput, this.modelId);
            }
          } else {
            this.makeId = null;
            this.makeName = null;
            this.modelId = null;
            this.modelName = null;
            this.modelInput = "";
            this.modelOptions = [];
            this.models = [];
            this.isLoadingModels = false;
          }
          this.isLoadingMakes = false;
        },
        error: () => {
          this.isLoadingMakes = false;
        }
      });
  }

  private matchMake(value: string, id: number | null): Make | null {
    if (id !== null) {
      const byId = this.makes.find(m => m.id === id);
      if (byId) return byId;
    }
    const v = this.normalizeText(value);
    if (!v) return null;
    return this.makes.find(m => this.normalizeText(m.name) === v) ?? null;
  }

  private matchModel(value: string, id: number | null): Model | null {
    if (id !== null) {
      const byId = this.models.find(m => m.id === id);
      if (byId) return byId;
    }
    const v = this.normalizeText(value);
    if (!v) return null;
    return this.models.find(m => this.normalizeText(m.name) === v) ?? null;
  }

  onMakeInputChange(value: string) {
    this.makeInput = value ?? "";
    const match = this.matchMake(this.makeInput, null);
    if (match && match.id === this.makeId) return;

    this.makeId = match ? match.id : null;
    this.makeName = match ? match.name : null;
    this.useOther = this.normalizeText(this.makeName ?? "") === "outro";
    this.modelId = null;
    this.modelName = null;
    this.modelInput = "";
    this.models = [];
    this.modelOptions = [];
    this.isLoadingModels = false;

    if (this.makeId !== null) {
      this.fetchModels(this.makeId, this.useOther ? "Outro" : null, null);
    }
  }

  onModelInputChange(value: string) {
    this.modelInput = value ?? "";
    const match = this.matchModel(this.modelInput, null);
    this.modelId = match ? match.id : null;
    this.modelName = match ? match.name : null;
    this.useOther = this.normalizeText(this.modelName ?? "") === "outro" ||
      this.normalizeText(this.makeName ?? "") === "outro";
  }

  fetchModels(makeId: number, keepModelInput: string | null, keepModelId: number | null) {
    this.isLoadingModels = true;
    this.http.get<{ models: Model[] }>(`${API}/api/vehicles/models?makeId=${makeId}`)
      .subscribe({
        next: (r) => {
          this.models = r.models ?? [];
          this.modelOptions = this.models.map(m => m.name);

          const match = this.matchModel(keepModelInput ?? "", keepModelId);
          if (match) {
            this.modelId = match.id;
            this.modelName = match.name;
            this.modelInput = match.name;
          } else {
            this.modelId = null;
            this.modelName = null;
            this.modelInput = "";
          }
          this.isLoadingModels = false;
        },
        error: () => {
          this.isLoadingModels = false;
        }
      });
  }

  back() { this.router.navigateByUrl("/"); }

  private parseYear(v: string): number | undefined {
    const s = (v ?? "").trim();
    if (!s) return undefined;
    if (!/^\d{4}$/.test(s)) return undefined;
    const n = Number(s);
    const y = new Date().getFullYear();
    if (n < 1950 || n > y + 1) return undefined;
    return n;
  }

  private normalizeText(value: string): string {
    return (value ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  onOtherToggle(checked: boolean) {
    this.useOther = checked;
    if (checked) {
      const other = this.makes.find(m => this.normalizeText(m.name) === "outro");
      if (other) {
        this.makeId = other.id;
        this.makeName = other.name;
        this.makeInput = other.name;
        this.modelId = null;
        this.modelName = null;
        this.modelInput = "";
        this.fetchModels(other.id, "Outro", null);
      } else {
        this.makeId = null;
        this.makeName = null;
        this.makeInput = "Outro";
        this.isLoadingModels = false;
      }
    } else {
      this.makeId = null;
      this.makeName = null;
      this.modelId = null;
      this.modelName = null;
      this.makeInput = "";
      this.modelInput = "";
      this.modelOptions = [];
      this.models = [];
      this.isLoadingModels = false;
    }
  }

  get showOtherNotes(): boolean {
    return this.normalizeText(this.makeName ?? "") === "outro" ||
      this.normalizeText(this.modelName ?? "") === "outro";
  }

  next() {
    if (this.makeId === null || this.modelId === null) return;
    const make = this.makes.find(x => x.id === this.makeId);
    const model = this.models.find(x => x.id === this.modelId);
    const vehicleYear = this.parseYear(this.vehicleYearInput);

    if (!make || !model) return;

    const patch: Partial<BookingDraft> = {
      makeId: make.id,
      makeName: make.name,
      modelId: model.id,
      modelName: model.name,
      vehicleYear: vehicleYear ?? undefined
    };

    if (this.showOtherNotes) {
      const notes = this.otherNotes.trim();
      patch.notes = notes || undefined;
    }

    this.store.set(patch);

    this.router.navigateByUrl("/schedule");
  }

  ngOnDestroy() {
    document.body.classList.remove("no-scroll");
  }
}
