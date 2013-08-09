class CreatePhones < ActiveRecord::Migration
  def change
    create_table :phones, id: false do |t|
      t.string :persistence_id
      t.string :phone_type
      t.string :content
      t.boolean :_removed, default: false
      t.string :client_id

      t.timestamps
    end
    add_index :phones, :persistence_id, :unique
    add_index :phones, :client_id
  end
end
