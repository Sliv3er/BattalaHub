export const PERMISSIONS = [
  'ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES',
  'KICK_MEMBERS', 'BAN_MEMBERS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS',
  'SEND_MESSAGES', 'READ_MESSAGES', 'MANAGE_MESSAGES', 'ATTACH_FILES',
  'CONNECT_VOICE', 'SPEAK', 'STREAM', 'MOVE_MEMBERS',
] as const;

export const hasPermission = (userRoles: any[], permission: string): boolean => {
  return userRoles.some(r =>
    r.role?.permissions?.includes('ADMINISTRATOR') ||
    r.role?.permissions?.includes(permission)
  );
};
