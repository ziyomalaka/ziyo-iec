export function isRetrainingLearningPath(pathname: string, learningHref: string) {
  if (!pathname || !learningHref) return false;
  return pathname === learningHref || pathname.startsWith(`${learningHref}/`);
}
