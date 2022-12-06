type DependencyType<Type> = [] & { __t: Type };

export type FullStateDependency = DependencyType<'FULL_STATE'>;
export type IgnoreAllDependencies = DependencyType<'IGNORE_ALL'>;

export const FULL_STATE_DEPENDENCY = [] as FullStateDependency;
export const IGNORE_ALL_DEPENDENCIES = [] as IgnoreAllDependencies;
