persistence.store.websql.config persistence, 'persistence_test', 'First test on persistence', 5 * 1024 * 1024

@Client = persistence.define 'Client',
  name: "TEXT"
  address: "TEXT"
@Client.index "name"
@Client.enableSync("/clients")

@Phone = persistence.define 'Phone',
  phone_type: "TEXT"
  content: "TEXT"
@Phone.enableSync("/phones")

@Client.hasMany('phones', @Phone, 'client')

persistence.schemaSync()
