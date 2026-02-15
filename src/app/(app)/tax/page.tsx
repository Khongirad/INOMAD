'use client';

import * as React from 'react';
import {
  Receipt,
  FileCheck,
  Wallet,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Send,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getTaxHistory,
  generateTaxRecord,
  fileTaxReturn,
  payTax,
} from '@/lib/api';
import type { TaxRecord, TaxRecordStatus } from '@/lib/api';

export default function TaxPage() {
  const [records, setRecords] = React.useState<TaxRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [year, setYear] = React.useState(new Date().getFullYear().toString());
  const [generating, setGenerating] = React.useState(false);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTaxHistory();
      setRecords(data);
    } catch (err: any) {
      toast.error(err.message || 'Error загрузки taxовой истории');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateTaxRecord(Number(year));
      toast.success(`Taxовая record за ${year} год создана`);
      setGenerateOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Error создания записи');
    } finally {
      setGenerating(false);
    }
  };

  const handleFile = async (id: string) => {
    try {
      await fileTaxReturn(id);
      toast.success('Declaration submitted');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePay = async (id: string) => {
    try {
      await payTax(id);
      toast.success('Tax оплачен');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status: TaxRecordStatus) => {
    const map: Record<TaxRecordStatus, { color: string; icon: React.ReactNode; label: string }> = {
      DRAFT: { color: 'bg-zinc-500/10 text-zinc-400', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      FILED: { color: 'bg-blue-500/10 text-blue-500', icon: <FileCheck className="h-3 w-3" />, label: 'Submitted' },
      PAID: { color: 'bg-emerald-500/10 text-emerald-500', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Paid' },
      OVERDUE: { color: 'bg-red-500/10 text-red-500', icon: <AlertCircle className="h-3 w-3" />, label: 'Просрочено' },
      DISPUTED: { color: 'bg-amber-500/10 text-amber-500', icon: <AlertCircle className="h-3 w-3" />, label: 'Оспаривается' },
    };
    const { color, icon, label } = map[status] || map.DRAFT;
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded', color)}>
        {icon} {label}
      </span>
    );
  };

  // Aggregate stats
  const totalTaxPaid = records.filter(r => r.isPaid).reduce((sum, r) => sum + Number(r.totalTaxPaid), 0);
  const totalIncome = records.reduce((sum, r) => sum + Number(r.totalIncome), 0);
  const currentYear = records.find(r => r.taxYear === new Date().getFullYear());
  const pendingCount = records.filter(r => r.status === 'DRAFT' || r.status === 'FILED').length;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Ежегодное taxообложение
          </h2>
          <p className="text-zinc-400">
            Republic 7% + Confederation 3% = итого 10% from incomeа за квесты
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchRecords} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Receipt className="mr-2 h-4 w-4" /> Create record
          </Button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <TrendingUp className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Общий income</div>
                <div className="text-lg font-mono font-bold text-white">
                  {totalIncome.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  <span className="text-gold-primary text-sm ml-1">ALT</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Tax уплачен</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {totalTaxPaid.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <Calendar className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Current год</div>
                <div className="text-lg font-mono font-bold text-white">
                  {currentYear ? getStatusBadge(currentYear.status) : 'No data'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Pending</div>
                <div className="text-lg font-mono font-bold text-amber-500">
                  {pendingCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Records List */}
      <Card className="border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Taxовая history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
              <p>No taxовых записей</p>
              <p className="text-xs mt-1">Записи генерируются автоматически 1 января or вручную.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records
                .sort((a, b) => b.taxYear - a.taxYear)
                .map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-lg bg-zinc-900/40 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-mono font-bold text-white">{record.taxYear}</div>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex gap-2">
                      {record.status === 'DRAFT' && (
                        <Button size="sm" variant="secondary" onClick={() => handleFile(record.id)}>
                          <Send className="mr-1 h-3 w-3" /> Submit декларацию
                        </Button>
                      )}
                      {record.status === 'FILED' && (
                        <Button size="sm" onClick={() => handlePay(record.id)}>
                          <Wallet className="mr-1 h-3 w-3" /> Pay
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-zinc-500">Income</div>
                      <div className="font-mono text-white">
                        {Number(record.totalIncome).toLocaleString('en-US', { maximumFractionDigits: 2 })} ALT
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Квестов</div>
                      <div className="font-mono text-white">{record.totalQuestsCompleted}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Republic (7%)</div>
                      <div className="font-mono text-blue-400">
                        {Number(record.republicTaxDue).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Confederation (3%)</div>
                      <div className="font-mono text-indigo-400">
                        {Number(record.confederationTaxDue).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Итого к оплате</div>
                      <div className={cn(
                        'font-mono font-bold',
                        record.isPaid ? 'text-emerald-500' : 'text-gold-primary'
                      )}>
                        {Number(record.totalTaxDue).toLocaleString('en-US', { maximumFractionDigits: 2 })} ALT
                      </div>
                    </div>
                  </div>

                  {record.isPaid && record.paidAt && (
                    <div className="mt-2 text-xs text-zinc-600">
                      Paid: {new Date(record.paidAt).toLocaleDateString('ru-RU')}
                      {record.paymentTxHash && ` · TX: ${record.paymentTxHash.slice(0, 12)}...`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Sheet */}
      <Sheet open={generateOpen} onOpenChange={setGenerateOpen} title="Create taxовую record">
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Taxовый год</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={2020}
              max={new Date().getFullYear()}
            />
          </div>

          <div className="p-3 rounded-lg bg-zinc-800/50 text-xs text-zinc-400">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            Systemа автоматически подсчитает income from всех квестоin за указанный год
            и рассчитает tax по ставке 10% (7% republic + 3% confederation).
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !year}
          >
            {generating ? 'Creation...' : 'Create record'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
