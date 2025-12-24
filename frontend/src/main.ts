import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { AppShell } from "./app/app.shell";
import { routes } from "./app/app.routes";

bootstrapApplication(AppShell, {
  providers: [provideRouter(routes), provideHttpClient()]
}).catch(console.error);
