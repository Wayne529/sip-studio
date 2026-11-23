import Dexie, { type Table } from 'dexie';
import type { Session } from '../domain/session';

export interface SavedDrink { id:string; name:string; recipeId:string; createdAt:number; session:Session; image?:Blob; score:number; }
class AtelierDatabase extends Dexie {
  drinks!:Table<SavedDrink,string>;
  drafts!:Table<{id:string;session:Session;updatedAt:number},string>;
  constructor(){ super('drink-atelier-v1');this.version(1).stores({drinks:'id, recipeId, createdAt',drafts:'id, updatedAt'}); }
}
export const db=new AtelierDatabase();
