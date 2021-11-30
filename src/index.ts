import { of, ReplaySubject, merge, Subject, Observable } from "rxjs";
import { scan, switchMap, map } from "rxjs/operators";

function Identity<T>(value: T) {
  return value;
}

interface User {
  id: number;
  name: string;
}

class UserMockWebService {
  readonly users: User[] = [
    { id: 1, name: "John" },
    { id: 2, name: "Liza" },
    { id: 3, name: "Suzi" },
  ];

  getUserById(id: number): Observable<User> {
    const user = this.users.find((user: User) => {
      return user.id === id;
    });
    return of(user) as Observable<User>;
  }
}

function reload(selector: Function = Identity) {
  return scan((oldValue, currentValue) => {
    if (!oldValue && currentValue)
      throw new Error(`Reload can't run before initial load`);

    return selector(currentValue || oldValue);
  });
}

export function combineReload<T>(
  valueObs: Observable<T>,
  reloadObs: Observable<void>,
  selector: Function = Identity
): Observable<T> {
  return merge(valueObs, reloadObs).pipe(
    reload(selector),
    map((value: any) => value as T)
  );
}

class UserService {
  private reload$ = new Subject<void>();
  private id$ = new ReplaySubject<number>(1);
  private webService: UserMockWebService;
  userObs: Observable<User> = combineReload<number>(
    this.id$,
    this.reload$
  ).pipe(
    switchMap((userId: number) => {
      return this.webService.getUserById(userId);
    })
  );
  constructor() {
    this.webService = new UserMockWebService();
  }

  setId(id: number): void {
    this.id$.next(id);
  }
  reload(): void {
    this.reload$.next(undefined);
  }
}
// Demo
const service = new UserService();
service.userObs.subscribe(console.log);
service.setId(2);
service.setId(3);
service.reload();
service.setId(2);
