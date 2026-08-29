/**
 * Corrige o icone de categorias que ficaram com nome fora do catalogo. Roda com:
 *
 *   npm run corrige:icones
 *
 * O campo `icon` precisa casar com um arquivo de frontend/public/assets/
 * taxonomy-icons, em minusculas e com hifen. Algumas categorias foram gravadas
 * com o nome do Lucide em CamelCase ("Flame", "Fence", "Shield"), que nao
 * corresponde a arquivo nenhum - por isso apareciam sem icone no app.
 *
 * E idempotente: so altera a categoria que ainda esta com o valor antigo.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CORRECOES: Array<{ slug: string; de: string; para: string; motivo: string }> = [
  { slug: 'gas', de: 'Flame', para: 'flame', motivo: 'nome em CamelCase nao existia como arquivo' },
  { slug: 'portoes-automacao', de: 'Fence', para: 'fence', motivo: 'nome em CamelCase nao existia como arquivo' },
  { slug: 'corretor-seguros', de: 'Shield', para: 'shield', motivo: 'o arquivo existe, mas em minusculas' },
  { slug: 'churrasqueiro', de: 'cooking', para: 'grill', motivo: 'panela nao representa churrasco' },
];

async function main() {
  for (const correcao of CORRECOES) {
    const categoria = await prisma.category.findUnique({ where: { slug: correcao.slug } });
    if (!categoria) {
      console.log(`  - ${correcao.slug}: categoria nao encontrada`);
      continue;
    }
    if (categoria.icon === correcao.para) {
      console.log(`  = ${categoria.name}: ja esta com "${correcao.para}"`);
      continue;
    }
    await prisma.category.update({ where: { id: categoria.id }, data: { icon: correcao.para } });
    console.log(`  + ${categoria.name}: "${categoria.icon}" -> "${correcao.para}" (${correcao.motivo})`);

    // Servicos herdam o icone da categoria no cadastro; corrige junto para nao
    // ficar meia dupla certa e meia errada nas listagens.
    const servicos = await prisma.categoryService.updateMany({
      where: { categoryId: categoria.id, icon: correcao.de },
      data: { icon: correcao.para },
    });
    if (servicos.count) console.log(`      ${servicos.count} servico(s) desta categoria tambem corrigido(s)`);
  }
}

main()
  .catch((erro) => {
    console.error('Falha ao corrigir os icones:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
