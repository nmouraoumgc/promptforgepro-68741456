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
import { toast } from 'sonner';

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
  const { promoCodes, createPromoCode, updatePromoCode } = usePromoStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'free_days',
    discount_value: 0,
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
      toast.error('Código é obrigatório');
      return;
    }
    if (formData.discount_value <= 0) {
      toast.error('Valor de desconto deve ser maior que 0');
      return;
    }
    if (!formData.expires_at) {
      toast.error('Data de expiração é obrigatória');
      return;
    }
    const expiresAt = new Date(formData.expires_at);
    expiresAt.setHours(23, 59, 59, 999);
    if (expiresAt < new Date()) {
      toast.error('Data de expiração não pode ser no passado');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        await updatePromoCode(editingId, formData);
        toast.success('Código atualizado com sucesso!');
      } else {
        if (!user) {
          toast.error('Utilizador não autenticado');
          return;
        }
        await createPromoCode({
          ...formData,
          created_by: user.id,
        });
        toast.success('Código criado com sucesso!');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao guardar código', { description: message });
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
            {editingId ? 'Editar Código de Promoção' : 'Novo Código de Promoção'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Código */}
          <div className="space-y-2">
            <Label>Código de Promoção</Label>
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
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ex: Desconto de verão"
            />
          </div>

          {/* Tipo de Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, discount_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (€)</SelectItem>
                  <SelectItem value="free_days">Dias Grátis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor do Desconto */}
            <div className="space-y-2">
              <Label>Valor</Label>
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

          {/* Planos Aplicáveis */}
          <div className="space-y-2">
            <Label>Planos Aplicáveis</Label>
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
            <Label>Máximo de Utilizações</Label>
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
              Data de Expiração
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
            <Label>Ativo</Label>
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
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'A guardar...' : editingId ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
