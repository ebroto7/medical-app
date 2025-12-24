"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import dynamic from "next/dynamic";
import type Lenis from 'lenis';

// Animation libraries are dynamically imported in effects to avoid SSR issues
import { Header } from "@/components/Header";
import { GradientBackground } from "@/components/GradientBackground";
import { AnimatedHeading } from "@/components/AnimatedHeading";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Heart,
  Utensils,
  TrendingUp,
  ChevronDown,
  Star,
  ChevronUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";


// Features data
const features = [
  {
    icon: Heart,
    title: "Salud Integral",
    description: "Registra tu nutrición diaria y monitorea tu salud con precisión",
  },
  {
    icon: Utensils,
    title: "Diario Nutricional",
    description: "Categoriza tus comidas y mantén un historial completo de tu alimentación",
  },
  {
    icon: TrendingUp,
    title: "Progreso Visible",
    description: "Visualiza tu evolución con gráficos y métricas detalladas",
  },
];

// Testimonials data
const testimonials = [
  {
    name: "María González",
    role: "Paciente",
    content: "NutriDiary cambió mi forma de ver la nutrición. Increíblemente fácil de usar.",
    rating: 5,
  },
  {
    name: "Dr. Carlos López",
    role: "Nutricionista",
    content: "La mejor herramienta para seguimiento de pacientes. Recomendado 100%.",
    rating: 5,
  },
];

// FAQ data
const faqs = [
  {
    question: "¿Cómo registro mis comidas?",
    answer:
      "Es muy simple: abre el diario, selecciona el tipo de comida, añade una foto o descripción, y listo. El sistema captura automáticamente los detalles.",
  },
  {
    question: "¿Puedo conectar con un nutricionista?",
    answer:
      "Sí, puedes buscar nutricionistas en la plataforma y solicitar seguimiento. Ellos revisarán tu diario y te darán recomendaciones personalizadas.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Absolutamente. Usamos encriptación de nivel enterprise y cumplimos con todas las regulaciones de privacidad de datos sanitarios.",
  },
  {
    question: "¿Hay costo?",
    answer:
      "El registro es gratuito. Algunos servicios premium están disponibles, pero puedes usar la mayoría de funcionalidades sin pagar nada.",
  },
];

// FAQ Accordion Item
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <Card className="overflow-hidden" key={index}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-accent/5 transition-colors"
      >
        <span className="text-lg font-semibold text-foreground text-left">
          {question}
        </span>
        <ChevronUp
          size={24}
          className={`text-primary flex-shrink-0 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""
            }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-border text-foreground/80">
          {answer}
        </div>
      )}
    </Card>
  );
}

export default function Home() {
  const { user, role, isLoading } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const getDashboardUrl = () => {
    return role === "nutritionist"
      ? "/dashboard/nutritionist/patients"
      : "/dashboard/patient";
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Initialize Lenis
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    let lenis: Lenis;
    let rafId: number;

    const initLenis = async () => {
      const LenisLib = (await import('lenis')).default;
      lenis = new LenisLib({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });

      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }

      rafId = requestAnimationFrame(raf);
    };

    initLenis();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
    };
  }, [isMounted]);

  // Hero animations
  useIsomorphicLayoutEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initHeroAnimation = async () => {
      const gsapLib = await import('gsap');
      const gsap = gsapLib.default;

      const heroLogo = document.querySelector("[data-hero-logo]");
      const heroTitle = document.querySelector("[data-hero-title]");
      const heroDesc = document.querySelector("[data-hero-desc]");
      const heroCTA = document.querySelector("[data-hero-cta]");

      if (heroLogo && heroTitle && heroDesc && heroCTA) {
        const timeline = gsap.timeline();

        timeline
          .fromTo(
            heroLogo,
            { scale: 0.5, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }
          )
          .fromTo(
            heroTitle,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
            "-=0.4"
          )
          .fromTo(
            heroDesc,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
            "-=0.4"
          )
          .fromTo(
            heroCTA,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
            "-=0.3"
          );
      }
    };

    initHeroAnimation();
  }, [isMounted]);

  // Features staggered animation
  useIsomorphicLayoutEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initFeatureAnimation = async () => {
      const [gsapLib, ScrollTriggerLib] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);
      const gsap = gsapLib.default;
      const ScrollTrigger = ScrollTriggerLib.default;

      gsap.registerPlugin(ScrollTrigger);

      const featureCards = gsap.utils.toArray("[data-feature-card]") as HTMLElement[];

      if (featureCards.length > 0) {
        featureCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              delay: index * 0.15,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 80%",
                end: "top 50%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }
    };

    initFeatureAnimation();
  }, [isMounted]);

  // Testimonials animation
  useIsomorphicLayoutEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initTestimonialsAnimation = async () => {
      const [gsapLib, ScrollTriggerLib] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);
      const gsap = gsapLib.default;
      const ScrollTrigger = ScrollTriggerLib.default;

      gsap.registerPlugin(ScrollTrigger);

      const testimonialCards = gsap.utils.toArray(
        "[data-testimonial-card]"
      ) as HTMLElement[];

      if (testimonialCards.length > 0) {
        testimonialCards.forEach((card) => {
          gsap.fromTo(
            card,
            { x: -50, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 75%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }
    };

    initTestimonialsAnimation();
  }, [isMounted]);

  // CTA animation
  useIsomorphicLayoutEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initCTAAnimation = async () => {
      const [gsapLib, ScrollTriggerLib] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger')
      ]);
      const gsap = gsapLib.default;
      const ScrollTrigger = ScrollTriggerLib.default;

      gsap.registerPlugin(ScrollTrigger);

      const ctaSection = document.querySelector("[data-cta-section]");

      if (ctaSection) {
        gsap.fromTo(
          ctaSection,
          { scale: 0.95, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaSection,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    };

    initCTAAnimation();
  }, [isMounted]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-border border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <GradientBackground className="min-h-[calc(100vh-64px)] flex items-center justify-center pt-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div data-hero-logo className="inline-block mb-8">
            <Logo size="lg" />
          </div>

          <h1
            data-hero-title
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6"
          >
            Tu Salud en Tus Manos
          </h1>

          <p
            data-hero-desc
            className="text-lg sm:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto"
          >
            Registra tu nutrición diaria, conecta con nutricionistas profesionales y
            monitorea tu progreso hacia una vida más saludable.
          </p>

          <div data-hero-cta className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" asChild>
                <a href={getDashboardUrl()}>Ir al Dashboard</a>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <a href="/auth/signup">Comenzar Ahora</a>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Más Información</a>
            </Button>
          </div>

          <div className="mt-16 animate-bounce">
            <ChevronDown className="mx-auto text-primary" size={32} />
          </div>
        </div>
      </GradientBackground>

      {/* Features Section */}
      <section
        id="features"
        className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <AnimatedHeading level="h2" className="text-center mb-16">
          Por Qué Elegir NutriDiary
        </AnimatedHeading>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                data-feature-card
                className="p-8 hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-4 inline-block p-3 bg-accent/10 rounded-lg">
                  <Icon className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-foreground/70">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <AnimatedHeading level="h2" className="text-center mb-16">
            Lo Que Dicen Nuestros Usuarios
          </AnimatedHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} data-testimonial-card className="p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className="fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-foreground/80 mb-6 text-lg leading-relaxed">
                  &quot;{testimonial.content}&quot;
                </p>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-cta-section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-12 text-center text-primary-foreground">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            {user ? "¡Bienvenido de Nuevo!" : "¿Listo para Transformar Tu Salud?"}
          </h2>
          <p className="text-lg mb-8 opacity-90">
            {user
              ? "Continúa registrando tu progreso y mejorando tu salud día a día."
              : "Únete a miles de usuarios que ya están mejorando su nutrición y salud con NutriDiary."}
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href={user ? getDashboardUrl() : "/auth/signup"}>
              {user ? "Ir al Dashboard" : "Crear Cuenta Gratis"}
            </a>
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <AnimatedHeading level="h2" className="text-center mb-16">
            Preguntas Frecuentes
          </AnimatedHeading>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                index={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-foreground/60 text-center sm:text-left">
            <p>&copy; 2024 NutriDiary. Hecho con ❤️ para tu salud.</p>
          </div>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
