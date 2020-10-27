import * as R from 'ramda'
import React, { useContext } from 'react'
import {
  Route,
  Redirect,
  Switch,
  useHistory,
  useLocation
} from 'react-router-dom'

import { AppContext } from 'src/App'
import AuthRegister from 'src/pages/AuthRegister'
import Cashout from 'src/pages/Cashout'
import Commissions from 'src/pages/Commissions'
import { Customers, CustomerProfile } from 'src/pages/Customers'
import Funding from 'src/pages/Funding'
import Locales from 'src/pages/Locales'
import MachineLogs from 'src/pages/MachineLogs'
import CashCassettes from 'src/pages/Maintenance/CashCassettes'
import MachineStatus from 'src/pages/Maintenance/MachineStatus'
import Notifications from 'src/pages/Notifications/Notifications'
import OperatorInfo from 'src/pages/OperatorInfo/OperatorInfo'
import ServerLogs from 'src/pages/ServerLogs'
import Services from 'src/pages/Services/Services'
import TokenManagement from 'src/pages/TokenManagement/TokenManagement'
import Transactions from 'src/pages/Transactions/Transactions'
import Triggers from 'src/pages/Triggers'
import UserManagement from 'src/pages/UserManagement/UserManagement'
import WalletSettings from 'src/pages/Wallet/Wallet'
import Wizard from 'src/pages/Wizard'
import { namespaces } from 'src/utils/config'

const tree = [
  {
    key: 'transactions',
    label: 'Transactions',
    route: '/transactions',
    component: Transactions
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    route: '/maintenance',
    get component() {
      return () => <Redirect to={this.children[0].route} />
    },
    children: [
      {
        key: 'cash_cassettes',
        label: 'Cash Cassettes',
        route: '/maintenance/cash-cassettes',
        component: CashCassettes
      },
      {
        key: 'funding',
        label: 'Funding',
        route: '/maintenance/funding',
        component: Funding
      },
      {
        key: 'logs',
        label: 'Machine Logs',
        route: '/maintenance/logs',
        component: MachineLogs
      },
      {
        key: 'machine-status',
        label: 'Machine Status',
        route: '/maintenance/machine-status',
        component: MachineStatus
      },
      {
        key: 'server-logs',
        label: 'Server',
        route: '/maintenance/server-logs',
        component: ServerLogs
      }
    ]
  },
  {
    key: 'settings',
    label: 'Settings',
    route: '/settings',
    get component() {
      return () => <Redirect to={this.children[0].route} />
    },
    children: [
      {
        key: namespaces.COMMISSIONS,
        label: 'Commissions',
        route: '/settings/commissions',
        component: Commissions
      },
      {
        key: namespaces.LOCALE,
        label: 'Locales',
        route: '/settings/locale',
        component: Locales
      },
      {
        key: namespaces.CASH_OUT,
        label: 'Cash-out',
        route: '/settings/cash-out',
        component: Cashout
      },
      {
        key: namespaces.NOTIFICATIONS,
        label: 'Notifications',
        route: '/settings/notifications',
        component: Notifications
      },
      {
        key: 'services',
        label: '3rd party services',
        route: '/settings/3rd-party-services',
        component: Services
      },
      {
        key: namespaces.WALLETS,
        label: 'Wallet',
        route: '/settings/wallet-settings',
        component: WalletSettings
      },
      {
        key: namespaces.OPERATOR_INFO,
        label: 'Operator Info',
        route: '/settings/operator-info',
        component: OperatorInfo
      }
    ]
  },
  {
    key: 'compliance',
    label: 'Compliance',
    route: '/compliance',
    get component() {
      return () => <Redirect to={this.children[0].route} />
    },
    children: [
      {
        key: 'triggers',
        label: 'Triggers',
        route: '/compliance/triggers',
        component: Triggers
      },
      {
        key: 'customers',
        label: 'Customers',
        route: '/compliance/customers',
        component: Customers
      },
      {
        key: 'customer',
        route: '/compliance/customer/:id',
        component: CustomerProfile
      }
    ]
  },
  {
    key: 'system',
    label: 'System',
    route: '/system',
    get component() {
      return () => <Redirect to={this.children[0].route} />
    },
    children: [
      {
        key: 'user-management',
        label: 'User Management',
        route: '/system/user-management',
        component: UserManagement
      },
      {
        key: 'token-management',
        label: 'Token Management',
        route: '/system/token-management',
        component: TokenManagement
      }
    ]
  }
]

const map = R.map(R.when(R.has('children'), R.prop('children')))
const leafRoutes = R.compose(R.flatten, map)(tree)
const parentRoutes = R.filter(R.has('children'))(tree)
const flattened = R.concat(leafRoutes, parentRoutes)

const Routes = () => {
  const history = useHistory()
  const location = useLocation()
  const { wizardTested } = useContext(AppContext)

  const dontTriggerPages = ['/404', '/register', '/wizard']

  if (!wizardTested && !R.contains(location.pathname)(dontTriggerPages)) {
    history.push('/wizard')
  }

  return (
    <Switch>
      <Route exact path="/">
        <Redirect to={{ pathname: '/transactions' }} />
      </Route>
      <Route path="/wizard" component={Wizard} />
      <Route path="/register" component={AuthRegister} />
      {flattened.map(({ route, component: Page, key }) => (
        <Route path={route} key={key}>
          <Page name={key} />
        </Route>
      ))}
      <Route path="/404" />
      <Route path="*">
        <Redirect to={{ pathname: '/404' }} />
      </Route>
    </Switch>
  )
}
export { tree, Routes }
