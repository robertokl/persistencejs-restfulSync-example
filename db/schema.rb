# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20130731214648) do

  create_table "clients", :id => false, :force => true do |t|
    t.string   "persistence_id"
    t.string   "name"
    t.string   "address"
    t.boolean  "_removed",       :default => false
    t.datetime "created_at",                        :null => false
    t.datetime "updated_at",                        :null => false
  end

  add_index "clients", ["persistence_id"], :name => "index_clients_on_persistence_id", :unique => true

  create_table "phones", :id => false, :force => true do |t|
    t.string   "persistence_id"
    t.string   "phone_type"
    t.string   "content"
    t.boolean  "_removed",       :default => false
    t.string   "client_id"
    t.datetime "created_at",                        :null => false
    t.datetime "updated_at",                        :null => false
  end

  add_index "phones", ["client_id"], :name => "index_phones_on_client_id"
  add_index "phones", ["persistence_id"], :name => "index_phones_on_persistence_id", :unique => true

end
