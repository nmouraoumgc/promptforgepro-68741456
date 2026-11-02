import { useEffect, useState } from 'react';
import { Ticket, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePromoStore } from '@/stores/promoStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/sonner-toast';
import { useIsEnglish } from '@/i18n/lang';

interface PromoCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId?: string | null;
  onSuccess?: () => void;
}

export function PromoCodeDialog({
  open,
  onOpenChange,
  editingId,
  onSuccess,
}: PromoCodeDialogProps) {
  const { user } = useAuthStore();
  const isEnglish = useIsEnglish();
  const { promoCodes, createPromoCode, updatePromoCode } = usePromoStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'free_days',
    discount_value: 0,
    duration_months: 0,
    applicable_plan_types: ['free', 'pro', 'premium'],
    max_uses: 100,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
  });

  useEffect(() => {
    if (editingId && open) {
      const promo = promoCodes.find(p => p.id === editingId);
      if (promo) {
        setFormData({
          code: promo.code,
          description: promo.description || '',
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          duration_months: promo.duration_months,
          applicable_plan_types: promo.applicable_plan_types,
          max_uses: promo.max_uses,
          expires_at: promo.expires_at.split('T')[0],
          is_active: promo.is_active,
        });
      }
    } else if (!editingId && open) {
      // Reset form for new promo
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        duration_months: 0,
        applicable_plan_types: ['free', 'pro', 'premium'],
        max_uses: 100,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true,
      });
    }
  }, [editingId, open, promoCodes]);

  const handleSave = async () => {
    // Validação
    if (!formData.code.trim()) {
      toast.error((isEnglish ? 'Code is required' : 'Código é obrigatório'));
      return;
    }
    if (formData.discount_value <= 0) {
      toast.error((isEnglish ? 'Discount value must be greater than 0' : 'Valor de desconto deve ser maior que 0'));
      return;
    }
    if (!formData.expires_at) {
      toast.error((isEnglish ? 'Expiry date is required' : 'Data de expiração é obrigatória'));
      return;
    }
    const expiresAt = new Date(formData.expires_at);
    expiresAt.setHours(23, 59, 59, 999);
    if (expiresAt < new Date()) {
      toast.error((isEnglish ? 'Expiry date cannot be in the past' : 'Data de expiração não pode ser no passado'));
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        await updatePromoCode(editingId, formData);
        toast.success((isEnglish ? 'Code updated successfully!' : 'Código atualizado com sucesso!'));
      } else {
        if (!user) {
          toast.error((isEnglish ? 'User not authenticated' : 'Utilizador não autenticado'));
          return;
        }
        await createPromoCode({
          ...formData,
          created_by: user.id,
        });
        toast.success((isEnglish ? 'Code created successfully!' : 'Código criado com sucesso!'));
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(isEnglish ? `Error saving code: ${message}` : `Erro ao guardar código: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {editingId ? (isEnglish ? 'Edit promo code' : 'Editar Código de Promoção') : (isEnglish ? 'New promo code' : 'Novo Código de Promoção')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Código */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Promo code' : 'Código de Promoção'}</Label>
            <Input
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="EX: SUMMER20"
              disabled={!!editingId}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Description (optional)' : 'Descrição (opcional)'}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={(isEnglish ? 'E.g. Summer discount' : 'Ex: Desconto de verão')}
            />
          </div>

          {/* Tipo de Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isEnglish ? 'Discount type' : 'Tipo de Desconto'}</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: any) => {
                  const defaultPlans =
                    value === 'free_days' ? ['pro'] : ['pro', 'premium'];
                  setFormData({
                    ...formData,
                    discount_type: value,
                    applicable_plan_types: defaultPlans,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{isEnglish ? 'Percentage (%)' : 'Percentagem (%)'}</SelectItem>
                  <SelectItem value="fixed">{isEnglish ? 'Fixed amount (€)' : 'Valor Fixo (€)'}</SelectItem>
                  <SelectItem value="free_days">{isEnglish ? 'Free days' : 'Dias Grátis'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor do Desconto */}
            <div className="space-y-2">
              <Label>{isEnglish ? 'Value' : 'Valor'}</Label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_value: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={
                  formData.discount_type === 'percentage'
                    ? 'Ex: 20'
                    : formData.discount_type === 'fixed'
                    ? 'Ex: 5.00'
                    : 'Ex: 7'
                }
              />
            </div>
          </div>

          {/* Duração do desconto (meses), only for percentage/fixed */}
          {formData.discount_type !== 'free_days' && (
            <div className="space-y-2">
              <Label>{isEnglish ? 'Discount duration (months)' : 'Duração do desconto (meses)'}</Label>
              <Input
                type="number"
                min={0}
                value={formData.duration_months}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_months: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Ex: 3"
              />
              <p className="text-xs text-muted-foreground">
                {isEnglish ? '0 = applies once, 3 = discount for 3 months' : '0 = aplica uma vez, 3 = desconto durante 3 meses'}
              </p>
            </div>
          )}

          {/* Planos Aplicáveis */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Applicable plans' : 'Planos Aplicáveis'}</Label>
            <div className="flex gap-4">
              {['free', 'pro', 'premium'].map((plan) => (
                <label key={plan} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_plan_types.includes(plan)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          applicable_plan_types: [
                            ...formData.applicable_plan_types,
                            plan,
                          ],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          applicable_plan_types:
                            formData.applicable_plan_types.filter(
                              (p) => p !== plan
                            ),
                        });
                      }
                    }}
                  />
                  <span className="capitalize text-sm">{plan}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Máximo de Utilizações */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Maximum uses' : 'Máximo de Utilizações'}</Label>
            <Input
              type="number"
              value={formData.max_uses}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_uses: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Ex: 100"
            />
          </div>

          {/* Data de Expiração */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isEnglish ? 'Expiry date' : 'Data de Expiração'}
            </Label>
            <Input
              type="date"
              value={formData.expires_at}
              onChange={(e) =>
                setFormData({ ...formData, expires_at: e.target.value })
              }
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between">
            <Label>{isEnglish ? 'Active' : 'Ativo'}</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {isEnglish ? 'Cancel' : 'Cancelar'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (isEnglish ? 'Saving...' : 'A guardar...') : editingId ? (isEnglish ? 'Update' : 'Atualizar') : (isEnglish ? 'Create' : 'Criar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
