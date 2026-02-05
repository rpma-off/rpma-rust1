export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
      <div className="text-center">
        {/* Logo and Spinner */}
        <div className="relative mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--rpma-teal))]/10 border border-[hsl(var(--rpma-teal))]/20 mb-6 animate-pulse">
            <div className="w-10 h-10 bg-[hsl(var(--rpma-teal))] rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">R</span>
            </div>
          </div>

          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--rpma-teal))]/15 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border border-[hsl(var(--rpma-teal))]/10 animate-spin animation-reverse"></div>
          <div className="absolute inset-4 rounded-full border border-[hsl(var(--rpma-teal))]/5 animate-spin"></div>
        </div>

        {/* Loading Text */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            RPMA V2
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-4">
            Chargement en cours...
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="w-2 h-2 bg-[hsl(var(--rpma-teal))] rounded-full animate-pulse"
                style={{ animationDelay: `${index * 0.2}s` }}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            PrÃ©paration de votre tableau de bord
          </p>
        </div>

        {/* Fun facts or tips */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="rpma-shell p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-[hsl(var(--rpma-teal))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Astuce</p>
                <p className="text-xs text-muted-foreground">
                  Utilisez Ctrl+K pour accÃ©der rapidement Ã  la recherche globale
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
