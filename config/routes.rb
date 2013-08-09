Persistence::Application.routes.draw do
  resources :logger, only: [:create]
  resources :clients
  resources :phones
  root to: "static#index"
end
