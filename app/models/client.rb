class Client < ActiveRecord::Base
  self.primary_key = :persistence_id
  attr_accessible :address, :name, :persistence_id
  has_many :phones

  before_save :generate_persistence_id, if: lambda { |client| client.persistence_id.blank? }

  scope :active, where(_removed: false)
  private
  def generate_persistence_id
    while self.persistence_id.blank? or !Client.find_by_persistence_id(self.persistence_id).blank?
      self.persistence_id = Digest::SHA1.hexdigest("--#{self.name}--#{Time.current.usec}--").upcase
    end
  end
end
