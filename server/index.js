import { startApolloServer } from "./app.js";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { connecDB } from "./db.js";
import dotenv from 'dotenv'

dotenv.config();
connecDB();
startApolloServer(typeDefs, resolvers);
