import { Routes } from "@angular/router";
import { ServiceSelectPage } from "./pages/service-select.page";
import { VehicleSelectPage } from "./pages/vehicle-select.page";
import { SchedulePage } from "./pages/schedule.page";
import { SuccessPage } from "./pages/success.page";
import { ConfirmPage } from "./pages/confirm.page";

export const routes: Routes = [
  { path: "", component: ServiceSelectPage },
  { path: "vehicle", component: VehicleSelectPage },
  { path: "schedule", component: SchedulePage },
  { path: "confirm", component: ConfirmPage }, 
  { path: "success", component: SuccessPage },
  { path: "**", redirectTo: "" }
];
