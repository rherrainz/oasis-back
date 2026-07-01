const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { slugify } = require("../src/utils/slugify");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const password_hash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        password_hash
      }
    });
  }

  const title = "Bienvenida a OasisJS Blogger";
  const slug = slugify(title);
  const existingPost = await prisma.post.findUnique({ where: { slug } });

  if (!existingPost) {
    await prisma.post.create({
      data: {
        title,
        slug,
        excerpt: "Un primer post de ejemplo para comprobar el listado y el detalle del blog.",
        content:
          "Este contenido se carga desde PostgreSQL usando Prisma. Podés editarlo desde el panel de administración y publicar nuevas entradas con imagen principal.",
        cover_image_url:
          "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
        author: "Equipo OasisJS Blogger",
        published: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
