import { Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { WalletBucket } from '@/hooks/useMoneyOverview'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

interface WalletSummaryProps {
  wallets: WalletBucket[]
  currency: string
}

export function WalletSummary({ wallets, currency }: WalletSummaryProps) {
  const { t } = useTranslation()
  const hasActivity = wallets.some(
    (wallet) => wallet.income > 0 || wallet.spent > 0,
  )

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold">{t('budgets.wallets')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('budgets.walletsHint')}
          </p>
        </div>
      </div>

      {hasActivity ? (
        <ul className="grid gap-2 sm:grid-cols-3">
          {wallets.map((wallet) => (
            <li
              key={wallet.method}
              className="rounded-xl border border-border bg-card p-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {t(`entries.payment.${wallet.method}`)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t('budgets.walletRemaining')}
              </p>
              <p
                className={cn(
                  'font-heading text-xl font-semibold tabular-nums',
                  wallet.remaining < 0 && 'text-destructive',
                )}
              >
                {formatMoney(wallet.remaining, currency)}
              </p>
              <div className="mt-2 space-y-0.5 text-xs tabular-nums text-muted-foreground">
                <p>
                  {t('budgets.walletIncome')}:{' '}
                  {formatMoney(wallet.income, currency)}
                </p>
                <p>
                  {t('budgets.walletSpent')}:{' '}
                  {formatMoney(wallet.spent, currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {t('budgets.walletsEmpty')}
        </p>
      )}
    </section>
  )
}
