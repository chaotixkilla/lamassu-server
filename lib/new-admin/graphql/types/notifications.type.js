const { gql } = require('apollo-server-express')

const typeDef = gql`
  type Rate {
    code: String
    name: String
    rate: Float
  }

  type Notification {
    id: ID!
    type: String
    detail: JSON
    message: String
    created: Date
    read: Boolean
    valid: Boolean
  }

  type Query {
    cryptoRates: JSONObject
    fiatRates: [Rate]
    notifications: [Notification]
    alerts: [Notification]
    hasUnreadNotifications: Boolean
  }

  type Mutation {
    toggleClearNotification(id: ID!, read: Boolean!): Notification
    clearAllNotifications: Notification
  }
`

module.exports = typeDef
