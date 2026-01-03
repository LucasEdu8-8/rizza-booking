import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { APP_CONFIG } from "../shared/config";

const API = APP_CONFIG.API_BASE;

type ConfirmResp =
  | { ok: true; status: "CONFIRMED" }
  | { ok: false; reason: "INVALID_TOKEN" | "TOKEN_EXPIRED" };

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="center-screen">
    <div class="card" style="text-align:center; width:min(560px, 92vw);">
      <img src="assets/brand/rizza-logo.png" alt="RIZZA"
           style="width:min(260px,60vw); display:block; margin:0 auto 18px;">

      <div class="title">Confirmação de Marcação</div>

      <div *ngIf="state==='loading'" style="color:var(--muted); margin-top:10px; line-height:1.6;">
        A confirmar…
      </div>

      <div *ngIf="state==='ok'" style="margin-top:10px; line-height:1.6;">
        Marcação confirmada.
      </div>

      <div *ngIf="state==='expired'" style="margin-top:10px; line-height:1.6;">
        Link expirado. Faz uma nova marcação.
      </div>

      <div *ngIf="state==='invalid'" style="margin-top:10px; line-height:1.6;">
        Link inválido.
      </div>

      <div *ngIf="state==='error'" style="margin-top:10px; line-height:1.6;">
        Erro ao confirmar.
      </div>

      <div style="height:16px"></div>

      <button class="btn" *ngIf="state==='ok'" (click)="goSuccess()">Continuar</button>
      <button class="btn" *ngIf="state!=='loading' && state!=='ok'" (click)="goHome()">Nova marcação</button>
    </div>
  </div>
  `
})
export class ConfirmPage implements OnInit {
  state: "loading" | "ok" | "expired" | "invalid" | "error" = "loading";

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get("token") ?? "";
    if (!token) { this.state = "invalid"; return; }

    this.http.post<ConfirmResp>(`${API}/api/bookings/confirm`, { token })
      .subscribe({
        next: (r) => {
          if (r.ok) this.state = "ok";
          else this.state = (r.reason === "TOKEN_EXPIRED") ? "expired" : "invalid";
        },
        error: () => this.state = "error"
      });
  }

  goSuccess() { this.router.navigateByUrl("/success"); }
  goHome() { this.router.navigateByUrl("/"); }
}
