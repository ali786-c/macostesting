# 📋 Besoins Backend - Dashboard Hôte

## 🎯 Endpoint de Statistiques du Dashboard

### Endpoint proposé
```
GET /api/users/{userId}/dashboard/stats
```

### Réponse attendue (DTO)

```json
{
  "totalPlaces": 5,
  "activePlaces": 4,
  "inactivePlaces": 1,
  "totalReservations": 42,
  "activeReservations": 8,
  "pendingReservations": 3,
  "confirmedReservations": 5,
  "completedReservations": 34,
  "cancelledReservations": 0,
  "totalRevenue": 1250.50,
  "monthlyRevenue": 320.00,
  "yearlyRevenue": 1250.50,
  "averageRating": 4.5,
  "totalReviews": 28,
  "totalViews": 156,
  "occupancyRate": 65.5,
  "averagePricePerDay": 25.00,
  "conversionRate": 12.5
}
```

### Détails des champs

#### Espaces
- **totalPlaces** : Nombre total de biens créés par l'utilisateur
- **activePlaces** : Nombre de biens actuellement actifs (`active = true`)
- **inactivePlaces** : Nombre de biens inactifs (`active = false`)

#### Réservations
- **totalReservations** : Nombre total de réservations reçues sur tous les biens de l'utilisateur
- **activeReservations** : Réservations avec statut `CONFIRMED` ou `PENDING`
- **pendingReservations** : Réservations avec statut `PENDING` (en attente de validation)
- **confirmedReservations** : Réservations avec statut `CONFIRMED`
- **completedReservations** : Réservations avec statut `COMPLETED`
- **cancelledReservations** : Réservations avec statut `CANCELLED`

#### Revenus
- **totalRevenue** : Revenus totaux depuis le début (réservations `CONFIRMED` + `COMPLETED`)
- **monthlyRevenue** : Revenus du mois en cours
- **yearlyRevenue** : Revenus de l'année en cours

#### Avis et Performance
- **averageRating** : Note moyenne reçue sur tous les biens (basée sur les reviews)
- **totalReviews** : Nombre total d'avis reçus
- **totalViews** : Nombre total de vues sur toutes les annonces (si tracking disponible)
- **occupancyRate** : Taux d'occupation en pourcentage (jours réservés / jours disponibles)
- **averagePricePerDay** : Prix moyen par jour de tous les biens actifs
- **conversionRate** : Taux de conversion (réservations / vues) en pourcentage

### Calculs suggérés

#### Revenus mensuels
```java
// Filtrer les réservations du mois en cours avec statut CONFIRMED ou COMPLETED
LocalDate now = LocalDate.now();
List<Reservation> monthlyReservations = reservations.stream()
    .filter(r -> r.getStatus().equals("CONFIRMED") || r.getStatus().equals("COMPLETED"))
    .filter(r -> {
        LocalDate resDate = r.getStartDateTime().toLocalDate();
        return resDate.getMonth() == now.getMonth() && 
               resDate.getYear() == now.getYear();
    })
    .collect(Collectors.toList());

BigDecimal monthlyRevenue = monthlyReservations.stream()
    .map(Reservation::getTotalPrice)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
```

#### Taux d'occupation
```java
// Calculer le nombre de jours réservés vs jours disponibles
long totalDaysAvailable = calculateTotalAvailableDays(userId);
long totalDaysReserved = calculateTotalReservedDays(userId);
double occupancyRate = (totalDaysReserved / (double) totalDaysAvailable) * 100;
```

#### Note moyenne
```java
// Calculer la moyenne des notes des reviews pour tous les biens de l'utilisateur
List<Review> allReviews = reviewService.getReviewsForUserPlaces(userId);
double averageRating = allReviews.stream()
    .mapToDouble(Review::getRating)
    .average()
    .orElse(0.0);
```

### Structure DTO Java suggérée

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostDashboardStatsDTO {
    // Espaces
    private Long totalPlaces;
    private Long activePlaces;
    private Long inactivePlaces;
    
    // Réservations
    private Long totalReservations;
    private Long activeReservations;
    private Long pendingReservations;
    private Long confirmedReservations;
    private Long completedReservations;
    private Long cancelledReservations;
    
    // Revenus
    private BigDecimal totalRevenue;
    private BigDecimal monthlyRevenue;
    private BigDecimal yearlyRevenue;
    
    // Performance
    private Double averageRating;
    private Long totalReviews;
    private Long totalViews; // Si tracking disponible
    private Double occupancyRate;
    private BigDecimal averagePricePerDay;
    private Double conversionRate; // Si tracking disponible
}
```

### Controller suggéré

```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/{userId}/dashboard/stats")
    public ResponseEntity<HostDashboardStatsDTO> getHostDashboardStats(
        @PathVariable Long userId
    ) {
        HostDashboardStatsDTO stats = userService.getHostDashboardStats(userId);
        return ResponseEntity.ok(stats);
    }
}
```

## 📝 Notes importantes

1. **Authentification** : L'endpoint doit vérifier que l'utilisateur connecté correspond au `userId` ou qu'il a les droits d'accès
2. **Performance** : Pour optimiser les performances, considérer l'utilisation de requêtes SQL agrégées plutôt que de charger toutes les données
3. **Caching** : Les statistiques peuvent être mises en cache (ex: 5 minutes) pour améliorer les performances
4. **Tracking des vues** : Si le système de tracking des vues n'existe pas encore, `totalViews` et `conversionRate` peuvent être initialisés à 0

## ✅ Avantages

- **Centralisation** : Toutes les statistiques en un seul appel API
- **Performance** : Calculs côté serveur, moins de données transférées
- **Cohérence** : Données toujours à jour et cohérentes
- **Extensibilité** : Facile d'ajouter de nouvelles statistiques à l'avenir



