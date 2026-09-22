import identity from './custom-app-identity.json'

export const CUSTOM_APP_IDENTITY = identity

/** Set from the packaged app's identity, not the shell that happened to launch it. */
export function configureCustomBuildEnvironment(appName: string): void {
  if (appName === identity.name) {
    process.env.ORCA_CUSTOM_BUILD = '1'
  } else {
    delete process.env.ORCA_CUSTOM_BUILD
  }
}

export function isCustomBuild(): boolean {
  return process.env.ORCA_CUSTOM_BUILD === '1'
}
