Persistence::Application.routes.draw do
  resources :logger, only: [:create]
  resources :clients
  root to: "static#index"
end
