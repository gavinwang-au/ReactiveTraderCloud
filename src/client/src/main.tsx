import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
// TODO: change to import when webpack bug solved https://github.com/webpack/webpack/issues/4160
import { getEnvVars } from './config/config'
import { OpenFin } from './system/openFin'
import createConnection from './system/service/connection'
import { User } from './types'
import { OpenFinProvider, ShellContainer } from './ui/shell'

import configureStore from './configureStore'
import {
  AnalyticsService,
  BlotterService,
  CompositeStatusService,
  ExecutionService,
  FakeUserRepository,
  PricingService,
  ReferenceDataService
} from './services'

// When the application is run in openfin then 'fin' will be registered on the global window object.
declare const window: any

const config = getEnvVars(process.env.REACT_APP_ENV)

const connectSocket = () => {
  const user: User = FakeUserRepository.currentUser
  const realm = 'com.weareadaptive.reactivetrader'
  const url = config.overwriteServerEndpoint
    ? config.serverEndpointUrl
    : location.hostname
  const port = config.overwriteServerEndpoint
    ? config.serverPort
    : location.port
  return createConnection(user.code, url, realm, +port)
}

const appBootstrapper = () => {
  const connection = connectSocket()
  const openFin = new OpenFin()
  const isRunningInFinsemble = window.FSBL
  const refDataService = ReferenceDataService(connection)
  const pricingService = PricingService(connection)
  const blotterService = BlotterService(connection)
  const execService = ExecutionService(connection, refDataService, openFin)
  const analyticsService = AnalyticsService(connection, refDataService)
  const compositeStatusService = CompositeStatusService(connection, [
    pricingService,
    refDataService,
    blotterService,
    execService,
    analyticsService
  ])
  // connect the underlying connection
  connection.connect()

  const store = configureStore(
    refDataService,
    blotterService,
    pricingService,
    analyticsService,
    compositeStatusService,
    execService,
    openFin
  )
  window.store = store
  ReactDOM.render(
    <Provider store={store}>
      <OpenFinProvider
        openFin={openFin}
        isRunningInFinsemble={isRunningInFinsemble}
      >
        <ShellContainer />
      </OpenFinProvider>
    </Provider>,
    document.getElementById('root')
  )
}

const runBootstrapper = location.pathname === '/' && location.hash.length === 0
// if we're not the root we (perhaps a popup) we never re-run the bootstrap logic

export function run() {
  if (runBootstrapper) {
    appBootstrapper()
  }
}
