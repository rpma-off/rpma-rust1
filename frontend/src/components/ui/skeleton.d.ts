declare module './skeleton' {
  export const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & React.RefAttributes<HTMLDivElement>>;
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}