import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Users, CreditCard, Plus, Edit, Trash2, 
  ToggleLeft, ToggleRight, Search, ChevronDown 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

interface PromptPack {
  id: string;
  name: string;
  description: string;
  slug: string;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  current_plan: string;
  created_at: string;
}

interface Purchase {
  id: string;
  user_id: string;
  plan: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuthStore();
  
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PromptPack | null>(null);
  const [packForm, setPackForm] = useState({
    name: '',
    description: '',
    slug: '',
    is_premium: true,
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      toast({
        title: 'Acesso negado',
        description: 'Não tens permissões de administrador.',
        variant: 'destructive',
      });
    }
  }, [isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch packs
    const { data: packsData } = await supabase
      .from('prompt_packs')
      .select('*')
      .order('sort_order');
    
    if (packsData) setPacks(packsData);

    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersData) setUsers(usersData);

    // Fetch purchases
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (purchasesData) setPurchases(purchasesData);

    setIsLoading(false);
  };

  const handleSavePack = async () => {
    if (editingPack) {
      const { error } = await supabase
        .from('prompt_packs')
        .update(packForm)
        .eq('id', editingPack.id);
      
      if (error) {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      } else {
        toast({ title: 'Pack atualizado' });
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('prompt_packs')
        .insert([{ ...packForm, sort_order: packs.length }]);
      
      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Pack criado' });
        fetchData();
      }
    }
    
    setPackDialogOpen(false);
    resetPackForm();
  };

  const handleToggleActive = async (pack: PromptPack) => {
    const { error } = await supabase
      .from('prompt_packs')
      .update({ is_active: !pack.is_active })
      .eq('id', pack.id);
    
    if (!error) {
      fetchData();
    }
  };

  const handleDeletePack = async (id: string) => {
    const { error } = await supabase
      .from('prompt_packs')
      .delete()
      .eq('id', id);
    
    if (!error) {
      toast({ title: 'Pack eliminado' });
      fetchData();
    }
  };

  const resetPackForm = () => {
    setEditingPack(null);
    setPackForm({
      name: '',
      description: '',
      slug: '',
      is_premium: true,
      is_active: true,
    });
  };

  const openEditPack = (pack: PromptPack) => {
    setEditingPack(pack);
    setPackForm({
      name: pack.name,
      description: pack.description || '',
      slug: pack.slug,
      is_premium: pack.is_premium,
      is_active: pack.is_active,
    });
    setPackDialogOpen(true);
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 lg:p-10 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Backoffice</h1>
          <p className="text-muted-foreground">Gestão de conteúdos e utilizadores</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{packs.length}</p>
                  <p className="text-sm text-muted-foreground">Prompt Packs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Utilizadores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{purchases.length}</p>
                  <p className="text-sm text-muted-foreground">Compras</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="packs">
          <TabsList className="mb-6">
            <TabsTrigger value="packs">Prompt Packs</TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="purchases">Compras</TabsTrigger>
          </TabsList>

          {/* Packs Tab */}
          <TabsContent value="packs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Prompt Packs</CardTitle>
                  <CardDescription>Gere os packs disponíveis</CardDescription>
                </div>
                <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetPackForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Pack
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPack ? 'Editar Pack' : 'Novo Pack'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={packForm.name}
                          onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                          placeholder="TikTok Viral Pack"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input
                          value={packForm.slug}
                          onChange={(e) => setPackForm({ ...packForm, slug: e.target.value })}
                          placeholder="tiktok-viral"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={packForm.description}
                          onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                          placeholder="Descrição do pack..."
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Premium</Label>
                        <Switch
                          checked={packForm.is_premium}
                          onCheckedChange={(v) => setPackForm({ ...packForm, is_premium: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Ativo</Label>
                        <Switch
                          checked={packForm.is_active}
                          onCheckedChange={(v) => setPackForm({ ...packForm, is_active: v })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePack}>
                        {editingPack ? 'Guardar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packs.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium">{pack.name}</TableCell>
                        <TableCell className="text-muted-foreground">{pack.slug}</TableCell>
                        <TableCell>
                          <Badge variant={pack.is_premium ? 'default' : 'secondary'}>
                            {pack.is_premium ? 'Premium' : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pack.is_active ? 'default' : 'outline'}>
                            {pack.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(pack)}
                            >
                              {pack.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPack(pack)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePack(pack.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {packs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum pack criado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Utilizadores</CardTitle>
                    <CardDescription>Lista de utilizadores registados</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Registado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.current_plan === 'premium' ? 'default' :
                            user.current_plan === 'pro' ? 'secondary' : 'outline'
                          }>
                            {user.current_plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-PT')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle>Compras</CardTitle>
                <CardDescription>Histórico de transações</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge>{purchase.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          {(purchase.amount_cents / 100).toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                            {purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString('pt-PT')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma compra registada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
