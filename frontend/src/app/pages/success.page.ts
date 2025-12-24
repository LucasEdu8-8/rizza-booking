import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { BookingDraftStore } from "../state/booking-draft.store";

@Component({
  standalone: true,
  template: `
  <div class="center-screen">
    <div class="card" style="text-align:center">
      <img src="assets/brand/rizza-logo.png" alt="RIZZA"
           style="width:min(260px,60vw); display:block; margin:0 auto 18px;">
      <div class="title">Marcação confirmada</div>

      <div style="color:var(--muted); line-height:1.6; margin-top:10px">
        Confirmação enviada por email.
      </div>

      <div style="height:16px"></div>
      <button class="btn" (click)="restart()">Nova marcação</button>
    </div>
  </div>
  `
})
export class SuccessPage {
  constructor(private store: BookingDraftStore, private router: Router) {}
  restart(){ this.store.clear(); this.router.navigateByUrl("/"); }
}
