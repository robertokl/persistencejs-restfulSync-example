class CreateClients < ActiveRecord::Migration
  def change
    create_table :clients, id: false do |t|
      t.string :persistence_id
      t.string :name
      t.string :address
      t.boolean :_removed, default: false

      t.timestamps
    end
    add_index :clients, :persistence_id, :unique
  end
end
