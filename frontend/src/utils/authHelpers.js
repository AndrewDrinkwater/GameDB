export function getAuthToken() {
  try {
    const session = JSON.parse(localStorage.getItem('gamedb_session'))
    return session?.token || null
  } catch {
    return null
  }
}




