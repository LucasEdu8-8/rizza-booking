import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { BookingDraftStore } from "../state/booking-draft.store";
import { OnDestroy } from "@angular/core";
import { APP_CONFIG } from "../shared/config";


const API = APP_CONFIG.API_BASE;

type Make = { id: number; name: string };
type Model = { id: number; name: string; imageKey: string; makeId: number };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="center-screen" style="padding:0; position:relative; height:100vh; overflow:hidden;">
  <div style="
    position:absolute; inset:0;
    background:url('assets/garage/garage.jpg') center/cover no-repeat;
    filter: blur(2px) brightness(0.55);
    transform: scale(1.05);
  "></div>

  <div style="position:relative; width:100%; height:100vh; display:flex; flex-direction:column; overflow:hidden;">

    <!-- top bar -->
    <div style="padding:16px; flex:0 0 auto;">
      <button class="btn" style="width:auto; padding:10px 14px" (click)="back()">Voltar</button>
    </div>

    <!-- center content (title + car or centered form) -->
    <div style="flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center; padding:0 18px;">
      <div style="text-align:center; width:min(980px, 92vw);">

        <div class="title" style="margin:0 0 10px;">Escolhe o teu veículo</div>

        <div *ngIf="selectedImageUrl"
          [style.height]="imageReady ? 'clamp(240px, 46vh, 420px)' : '0px'"
          style="
            overflow:hidden;
            display:flex;
            align-items:center;
            justify-content:center;
            transition: height 180ms ease;
          ">
          <div class="vehicle-stage" [style.opacity]="imageReady ? '1' : '0'" style="transition: opacity 160ms ease;">
            <img
              [src]="selectedImageUrl"
              class="vehicle-img"
              alt="Veículo"
              (load)="onImageLoad()"
              (error)="onImageError()"
            >
          </div>
        </div>

        <div *ngIf="!imageReady" style="margin-top:18px; display:flex; justify-content:center;">
          <ng-container *ngTemplateOutlet="formPanel"></ng-container>
        </div>

      </div>
    </div>

    <!-- bottom fixed panel (form) -->
    <div *ngIf="imageReady" style="
      flex:0 0 auto;
      padding: 14px 18px 18px;
      display:flex;
      justify-content:center;
    ">
      <ng-container *ngTemplateOutlet="formPanel"></ng-container>
    </div>

  </div>
</div>

<ng-template #formPanel>
  <div style="
    width: min(620px, 92vw);
    background: linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.48));
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 16px;
    backdrop-filter: blur(10px);
  ">
    <select class="select" [(ngModel)]="makeId" (ngModelChange)="onMakeChange($event)">
      <option [ngValue]="null" disabled>Marca</option>
      <option *ngFor="let m of makes" [ngValue]="m.id">{{ m.name }}</option>
    </select>

    <div style="height:10px"></div>

    <select class="select" [(ngModel)]="modelId" (ngModelChange)="onModelChange()" [disabled]="makeId === null">
      <option [ngValue]="null" disabled>Modelo</option>
      <option *ngFor="let m of models" [ngValue]="m.id">{{ m.name }}</option>
    </select>

    <div style="height:10px"></div>

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

    <div style="height:12px"></div>

    <button class="btn" (click)="next()" [disabled]="makeId === null || modelId === null">Continuar</button>
  </div>
</ng-template>
  `
})
export class VehicleSelectPage implements OnInit {
  makes: Make[] = [];
  models: Model[] = [];

  makeId: number | null = null;
  modelId: number | null = null;

  years: number[] = [];
  vehicleYearInput = "";

  selectedImageKey: string | null = null;
  selectedImageUrl: string | null = null;
  imageReady = false;

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
    this.selectedImageKey = draft.imageKey ?? null;

    const y = new Date().getFullYear();
    this.years = Array.from({ length: 10 }, (_, i) => y - i);

    this.http.get<{ makes: Make[] }>(`${API}/api/vehicles/makes`)
      .subscribe(r => this.makes = r.makes);

    if (this.makeId !== null) {
      this.fetchModels(this.makeId, true);
    }
  }

  onMakeChange(value: any) {
    const makeId = typeof value === "string" ? Number(value) : value;
    this.makeId = Number.isFinite(makeId) ? makeId : null;

    this.modelId = null;
    this.selectedImageKey = null;
    this.selectedImageUrl = null;
    this.imageReady = false;
    this.models = [];

    if (this.makeId !== null) {
      this.fetchModels(this.makeId, false);
    }
  }

  fetchModels(makeId: number, keepModel: boolean) {
    this.http.get<{ models: Model[] }>(`${API}/api/vehicles/models?makeId=${makeId}`)
      .subscribe(r => {
        this.models = r.models;

        if (keepModel && this.modelId !== null) {
          const found = this.models.find(x => x.id === this.modelId);
          if (found) this.selectedImageKey = found.imageKey;
          else this.modelId = null;
        }
      });
  }

  onModelChange() {
    const found = this.models.find(x => x.id === this.modelId);
    this.imageReady = false;
    this.selectedImageUrl = found ? `${API}/api/vehicle-image?modelId=${found.id}&view=front-left` : null;
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

  next() {
    const make = this.makes.find(x => x.id === this.makeId);
    const model = this.models.find(x => x.id === this.modelId);
    const vehicleYear = this.parseYear(this.vehicleYearInput);

    if (!make || !model) return;

    this.store.set({
      makeId: make.id,
      makeName: make.name,
      modelId: model.id,
      modelName: model.name,
      vehicleYear: vehicleYear ?? undefined,
      imageKey: model.imageKey
    });

    this.router.navigateByUrl("/schedule");
  }

  onImageLoad() {
    this.imageReady = true;
  }

  onImageError() {
    this.selectedImageUrl = null;
    this.imageReady = false;
  }

  ngOnDestroy() {
    document.body.classList.remove("no-scroll");
  }
}



