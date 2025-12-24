import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { BookingDraftStore, ServiceType } from "../state/booking-draft.store";

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="center-screen">
    <div class="card" style="text-align:center">
      <img src="assets/brand/rizza-logo.png" alt="RIZZA"
           style="width:min(360px,70vw); display:block; margin:0 auto 18px;">
      <p class="title">Seleciona o serviço</p>

      <select class="select" [(ngModel)]="service">
        <option [ngValue]="undefined" disabled>Escolher…</option>
        <option [ngValue]="'WASH_FULL'">Lavagem Completa</option>
        <option [ngValue]="'REVIEW'">Revisão</option>
      </select>

      <div style="height:14px"></div>
      <button class="btn" (click)="next()" [disabled]="!service">Continuar</button>
    </div>
  </div>
  `
})
export class ServiceSelectPage {
  service?: ServiceType;
  constructor(private store: BookingDraftStore, private router: Router) {}
  next() {
    if (!this.service) return;
    this.store.set({ serviceType: this.service });
    this.router.navigateByUrl("/vehicle");
  }
}
