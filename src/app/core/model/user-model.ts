import { UserRoleEnum } from './user-role-enum';

export interface UserModel {
  id: string;
  name: string;
  email?: string;
  username?: string;
  roles: UserRoleEnum[];
}
