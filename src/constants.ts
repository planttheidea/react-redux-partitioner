type DependencyType<Type> = [] & { __t: Type };

export type AllDepencencies = DependencyType<'ALL'>;
export type NoDependencies = DependencyType<'NONE'>;

export const ALL_DEPENDENCIES = [] as AllDepencencies;
export const NO_DEPENDENCIES = [] as NoDependencies;
