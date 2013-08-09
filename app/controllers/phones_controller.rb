class PhonesController < ApplicationController
  respond_to :json
  def index
    since = Time.at(params[:since].to_i + 1) if params[:since].present?
    @phones = Phone
    @phones = @phones.where("`phones`.`updated_at` > ?", since) if since.present?
    @phones = @phones.all
    respond_with({now: Time.new.to_i, phones: @phones})
  end

  def show
    @phone = Phone.find(params[:id])
  end

  def create
    respond_with Phone.create(params[:phone])
  end

  def update
    respond_with Phone.active.find_by_persistence_id!(params[:id]).update_attributes(params[:client])
  end

  def destroy
    respond_with Phone.active.find_by_persistence_id!(params[:id]).update_attribute(:_removed, true)
  end
end
