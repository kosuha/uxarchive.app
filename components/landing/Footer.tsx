import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/favicon.svg"
                alt="UX Archive Logo"
                width={20}
                height={20}
                className="size-7"
                priority
              />
              <span className="text-xl font-black">UX Archive</span>
            </div>
            <p className="text-sm text-muted-foreground">
              UX/UI pattern archive
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm text-muted-foreground"></h4>
            <ul className="space-y-2 text-sm">
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm text-muted-foreground"></h4>
            <ul className="space-y-2 text-sm">
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm text-muted-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:okeydokekim@gmail.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 UX Archive. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
          </div>
        </div>
      </div>
    </footer>
  );
}
