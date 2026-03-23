export interface RouteConfig {
  path: string
  component: string
  children?: RouteConfig[]
}

export class RouteServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'RouteServiceError'
  }
}

export async function fetchRoutes(): Promise<RouteConfig[]> {
  try {
    const response = await fetch('/api/routes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new RouteServiceError(`Failed to fetch routes: ${response.statusText}`, response.status)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      throw new RouteServiceError('Invalid response format: expected an array of routes')
    }

    // Validate route structure
    data.forEach((route, index) => {
      if (!route.path || !route.component) {
        throw new RouteServiceError(
          `Invalid route at index ${index}: missing required fields (path, component)`,
        )
      }
    })

    return data
  } catch (error) {
    if (error instanceof RouteServiceError) {
      throw error
    }

    if (error instanceof SyntaxError) {
      throw new RouteServiceError('Failed to parse routes response: invalid JSON')
    }

    if (error instanceof TypeError) {
      throw new RouteServiceError('Network error: unable to reach API endpoint')
    }

    throw new RouteServiceError(
      error instanceof Error ? error.message : 'Unknown error occurred while fetching routes',
    )
  }
}
