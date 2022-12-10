type DependencyType<Type> = [] & { __t: Type };

export type IgnoreAllDependencies = DependencyType<'IGNORE_ALL'>;

export const IGNORE_ALL_DEPENDENCIES = [] as IgnoreAllDependencies;
