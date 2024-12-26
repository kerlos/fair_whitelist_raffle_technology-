import { Database } from "bun:sqlite";

const db = new Database("db.sqlite");

const deleteQuery = `DELETE FROM holders`;

db.run(deleteQuery);

console.log("All data from 'holders' table has been cleaned.");
