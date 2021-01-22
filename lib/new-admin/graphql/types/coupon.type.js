const { gql } = require('apollo-server-express')

const typeDef = gql`
  type Coupon {
    id: ID!
    code: String!
    discount: Int!
  }

  type Query {
    coupons: [Coupon]
  }

  type Mutation {
    createCoupon(code: String!, discount: Int!): Coupon
    deleteCoupon(couponId: ID!): Coupon
  }
`

module.exports = typeDef
