import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { slugify } from "../src/utils/slugify.js";

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
        password_hash,
        role: "admin"
      }
    });
  } else if (existingAdmin.role !== "admin") {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: "admin" } });
  }

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const category = await prisma.category.upsert({
    where: { slug: "desarrollo-web" },
    update: {},
    create: {
      name: "Desarrollo Web",
      slug: "desarrollo-web",
      description: "Publicaciones sobre frontend, backend y aplicaciones web."
    }
  });

  const title = "Bienvenida a OasisJS Blogger";
  const slug = slugify(title);
  const existingPost = await prisma.post.findUnique({ where: { slug } });

  if (!existingPost) {
    const tags = await Promise.all(
      ["JavaScript", "React", "Backend"].map((name) =>
        prisma.tag.upsert({
          where: { slug: slugify(name) },
          update: {},
          create: { name, slug: slugify(name) }
        })
      )
    );

    await prisma.post.create({
      data: {
        title,
        slug,
        excerpt: "Un primer post de ejemplo para comprobar el listado y el detalle del blog.",
        content:
          "Este contenido se carga desde PostgreSQL usando Prisma. Podés editarlo desde el panel de administración y publicar nuevas entradas con imagen principal.",
        cover_image_url:
          "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
        author_id: admin.id,
        category_id: category.id,
        published: true,
        tags: {
          create: tags.map((tag) => ({ tag: { connect: { id: tag.id } } }))
        }
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
