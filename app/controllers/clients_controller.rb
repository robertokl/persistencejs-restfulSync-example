class ClientsController < ApplicationController
  respond_to :json
  def index
    since = Time.at(params[:since].to_i + 1) if params[:since].present?
    @clients = Client
    @clients = @clients.where("`clients`.`updated_at` > ?", since) if since.present?
    @clients = @clients.all
    respond_with({now: Time.new.to_i, clients: @clients})
  end

  def show
    @client = Client.find(params[:id])
  end

  def create
    respond_with Client.create(params[:client])
  end

  def update
    respond_with Client.active.find_by_persistence_id!(params[:id]).update_attributes(params[:client])
  end

  def destroy
    respond_with Client.active.find_by_persistence_id!(params[:id]).update_attribute(:_removed, true)
  end
end
