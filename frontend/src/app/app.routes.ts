import { Routes } from "@angular/router";
import { ServiceSelectPage } from "./pages/service-select.page";
import { VehicleSelectPage } from "./pages/vehicle-select.page";
import { SchedulePage } from "./pages/schedule.page";
import { SuccessPage } from "./pages/success.page";

export const routes: Routes = [
  { path: "", component: ServiceSelectPage },
  { path: "vehicle", component: VehicleSelectPage },
  { path: "schedule", component: SchedulePage },
  { path: "success", component: SuccessPage },
  { path: "**", redirectTo: "" }
];
