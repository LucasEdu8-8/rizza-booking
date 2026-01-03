export type AppConfig = {
  API_BASE: string,
  API_BASE_PROD?: string,
  API_BASE_TEST?: string,
}; 

const defaults: AppConfig = {
  API_BASE: "https://api.rizzagroup.com",
  API_BASE_PROD: "https://api.rizzagroup.com",
  API_BASE_TEST: "http://localhost:3000"
};

const w = window as any;
export const APP_CONFIG: AppConfig = {
    ...defaults,
    ...(w.__RIZZA_CONFIG ?? {}),
}
