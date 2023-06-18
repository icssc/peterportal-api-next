import { restResolverFactory } from './lib'

export default {
  Query: {
    rawGrades: restResolverFactory('/v1/rest/grades/raw'),
    aggregateGrades: restResolverFactory('/v1/rest/grades/aggregate'),
    gradesOptions: restResolverFactory('/v1/rest/grades/options'),
    websoc: restResolverFactory('/v1/rest/websoc', (args) => ({
      ...args,
      ...(args.ge !== undefined && { ge: args.ge?.toString().replace('_', '-') }),
    })),
  },
}
