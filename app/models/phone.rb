class Phone < ActiveRecord::Base
  self.primary_key = :persistence_id
  attr_accessible :phone_type, :content, :persistence_id, :client_id
  belongs_to :client

  before_save :generate_persistence_id, if: lambda { |phone| phone.persistence_id.blank? }

  scope :active, where(_removed: false)
  private
  def generate_persistence_id
    while self.persistence_id.blank? or !Phone.find_by_persistence_id(self.persistence_id).blank?
      self.persistence_id = Digest::SHA1.hexdigest("--#{self.content}--#{Time.current.usec}--").upcase
    end
  end
end
