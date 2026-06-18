import { redirect } from "next/navigation";

type ProductRedirectProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductRedirect({ params }: ProductRedirectProps) {
  const { slug } = await params;
  redirect(`/en/products/${slug}`);
}
