// Message type constants for auth-related background/content-script communication.
// Kept in a separate file with zero imports so the background service worker can
// import only this without pulling in @supabase/supabase-js.

export const LAUNCH_AUTH_FLOW_MESSAGE_TYPE = "loop/launch-auth-flow";
export const SIGN_IN_WITH_GOOGLE_MESSAGE_TYPE = "loop/sign-in-with-google";
