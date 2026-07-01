export type UserRole = 'Admin' | 'Supervisor' | 'Inspector' | 'Administrator' | 'Viewer';

export type AssignableUserRole = 'Admin' | 'Supervisor' | 'Inspector';

export type AccountRepositoryUser = {
  username: string;
  firstName: string;
  lastName: string;
};

export type UserRecord = {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export const USER_ROLES: UserRole[] = ['Administrator', 'Supervisor', 'Inspector', 'Viewer'];

export const ASSIGNABLE_USER_ROLES: AssignableUserRole[] = ['Admin', 'Supervisor', 'Inspector'];

export const ACCOUNT_REPOSITORY_USERS: AccountRepositoryUser[] = [
  { username: 'acampos', firstName: 'Alyssa', lastName: 'Campos' },
  { username: 'blin', firstName: 'Brandon', lastName: 'Lin' },
  { username: 'cvega', firstName: 'Carlos', lastName: 'Vega' },
  { username: 'dreeves', firstName: 'Diana', lastName: 'Reeves' },
  { username: 'epatel', firstName: 'Ethan', lastName: 'Patel' },
  { username: 'fnouri', firstName: 'Farah', lastName: 'Nouri' },
  { username: 'gito', firstName: 'Grace', lastName: 'Ito' },
  { username: 'hbrooks', firstName: 'Henry', lastName: 'Brooks' },
  { username: 'ifoster', firstName: 'Isla', lastName: 'Foster' },
  { username: 'jowens', firstName: 'Jordan', lastName: 'Owens' },
  { username: 'kalvarez', firstName: 'Kai', lastName: 'Alvarez' },
  { username: 'lturner', firstName: 'Lena', lastName: 'Turner' },
  { username: 'mporter', firstName: 'Maya', lastName: 'Porter' },
  { username: 'nellis', firstName: 'Noah', lastName: 'Ellis' },
];

export const USERS: UserRecord[] = [
  {
    userId: 'user-1',
    username: 'acampos',
    firstName: 'Alyssa',
    lastName: 'Campos',
    email: 'alyssa.campos@eiip.test',
    role: 'Administrator',
    active: true,
  },
  {
    userId: 'user-2',
    username: 'blin',
    firstName: 'Brandon',
    lastName: 'Lin',
    email: 'brandon.lin@eiip.test',
    role: 'Supervisor',
    active: true,
  },
  {
    userId: 'user-3',
    username: 'cvega',
    firstName: 'Carlos',
    lastName: 'Vega',
    email: 'carlos.vega@eiip.test',
    role: 'Inspector',
    active: true,
  },
  {
    userId: 'user-4',
    username: 'dreeves',
    firstName: 'Diana',
    lastName: 'Reeves',
    email: 'diana.reeves@eiip.test',
    role: 'Inspector',
    active: false,
  },
  {
    userId: 'user-5',
    username: 'epatel',
    firstName: 'Ethan',
    lastName: 'Patel',
    email: 'ethan.patel@eiip.test',
    role: 'Viewer',
    active: true,
  },
  {
    userId: 'user-6',
    username: 'fnouri',
    firstName: 'Farah',
    lastName: 'Nouri',
    email: 'farah.nouri@eiip.test',
    role: 'Supervisor',
    active: true,
  },
  {
    userId: 'user-7',
    username: 'gito',
    firstName: 'Grace',
    lastName: 'Ito',
    email: 'grace.ito@eiip.test',
    role: 'Inspector',
    active: false,
  },
  {
    userId: 'user-8',
    username: 'hbrooks',
    firstName: 'Henry',
    lastName: 'Brooks',
    email: 'henry.brooks@eiip.test',
    role: 'Viewer',
    active: true,
  },
  {
    userId: 'user-9',
    username: 'ifoster',
    firstName: 'Isla',
    lastName: 'Foster',
    email: 'isla.foster@eiip.test',
    role: 'Administrator',
    active: true,
  },
  {
    userId: 'user-10',
    username: 'jowens',
    firstName: 'Jordan',
    lastName: 'Owens',
    email: 'jordan.owens@eiip.test',
    role: 'Supervisor',
    active: false,
  },
  {
    userId: 'user-11',
    username: 'kalvarez',
    firstName: 'Kai',
    lastName: 'Alvarez',
    email: 'kai.alvarez@eiip.test',
    role: 'Inspector',
    active: true,
  },
  {
    userId: 'user-12',
    username: 'lturner',
    firstName: 'Lena',
    lastName: 'Turner',
    email: 'lena.turner@eiip.test',
    role: 'Viewer',
    active: true,
  },
];
