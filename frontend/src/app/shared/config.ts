export type AppConfig = {
  API_BASE: string,
  API_BASE_PROD: string,
}; 

const defaults: AppConfig = {
  API_BASE: "http://localhost:3000",
  API_BASE_PROD: "https://api.rizzagroup.com",
};

const w = window as any;
export const APP_CONFIG: AppConfig = {
    ...defaults,
    ...(w.__RIZZA_CONFIG ?? {}),
}
